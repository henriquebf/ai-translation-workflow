const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');

const OPENAI_SECRET_KEY = process.env.OPENAI_SECRET_KEY;
const SOURCE_LANG = process.env.SOURCE_LANG
    ? process.env.SOURCE_LANG.toLowerCase()
    : 'en';
const TARGET_LANGS = process.env.TARGET_LANGS
    ? process.env.TARGET_LANGS.trim().split(',')
    : [];
const LOCALES_PATH = process.env.LOCALES_ROOT_PATH
    ? `${process.env.LOCALES_ROOT_PATH}/locales`
    : 'locales';

async function translateText(key, text, targetLang) {
    try {
        if (text.trim() === '') {
            return text;
        }
        console.log(`Translating text to ${targetLang}.${key}:`, text);
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4-turbo-preview',
                messages: [
                    {
                        role: 'system',
                        content: `You are a professional translator. Translate the text to ${targetLang} maintaining the exact meaning, tone, and any special formatting or variables. Keep technical terms, variables (like {count}, {count, plural, =0 {...} }, etc), and special characters unchanged. Only respond with the translation, no explanations.`,
                    },
                    {
                        role: 'user',
                        content: text,
                    },
                ],
                temperature: 0.3,
            },
            {
                headers: {
                    Authorization: `Bearer ${OPENAI_SECRET_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error(`Translation error for ${targetLang}:`, error.message);
        throw error;
    }
}

async function translateObject(obj, targetLang) {
    const translatedObj = {};

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
            translatedObj[key] = await translateObject(value, targetLang);
        } else if (typeof value === 'string') {
            translatedObj[key] = await translateText(key, value, targetLang);
        } else {
            translatedObj[key] = value;
        }
    }

    return translatedObj;
}

/**
 * Get missing and obsolete keys between source and target objects
 * @param {Object} sourceObj - The source language object
 * @param {Object} targetObj - The target language object
 * @param {string} parentKey - The current parent key for nested objects
 * @returns {Object} Object containing missing and obsolete keys
 */
function getDifferences(sourceObj, targetObj, parentKey = '') {
    const differences = {
        missing: {},
        obsolete: new Set(),
    };

    // Helper function to flatten object paths
    const flattenObject = (obj, prefix = '') => {
        const flattened = {};

        for (const [key, value] of Object.entries(obj)) {
            const newKey = prefix ? `${prefix}.${key}` : key;

            if (typeof value === 'object' && value !== null) {
                Object.assign(flattened, flattenObject(value, newKey));
            } else {
                flattened[newKey] = value;
            }
        }

        return flattened;
    };

    const flatSource = flattenObject(sourceObj);
    const flatTarget = flattenObject(targetObj);

    // Find missing keys (in source but not in target)
    for (const [key, value] of Object.entries(flatSource)) {
        if (!(key in flatTarget)) {
            _.set(differences.missing, key, value);
        }
    }

    // Find obsolete keys (in target but not in source)
    for (const key of Object.keys(flatTarget)) {
        if (!(key in flatSource)) {
            differences.obsolete.add(key);
        }
    }

    return differences;
}

/**
 * Remove specified keys from an object
 * @param {Object} obj - The object to remove keys from
 * @param {Set<string>} keys - Set of dot-notation keys to remove
 */
function removeObsoleteKeys(obj, keys) {
    for (const key of keys) {
        const parts = key.split('.');
        let current = obj;

        // Navigate to the parent of the key to be removed
        for (let i = 0; i < parts.length - 1; i++) {
            current = current[parts[i]];
            if (!current) break;
        }

        // Remove the key
        if (current) {
            delete current[parts[parts.length - 1]];
        }

        // Clean up empty objects
        for (let i = parts.length - 2; i >= 0; i--) {
            const parent = _.get(obj, parts.slice(0, i).join('.'));
            const child = _.get(obj, parts.slice(0, i + 1).join('.'));

            if (parent && child && Object.keys(child).length === 0) {
                delete parent[parts[i]];
            }
        }
    }
}

async function main() {
    try {
        // Validate environment variables
        if (!TARGET_LANGS || !TARGET_LANGS.length) {
            console.log('No target languages specified. Exiting...');
            process.exit(1);
        }

        // Read source language file
        const sourceContent = await fs.readJson(
            path.join(LOCALES_PATH, `${SOURCE_LANG}.json`)
        );

        for (const targetLang of TARGET_LANGS) {
            const targetPath = path.join(LOCALES_PATH, `${targetLang}.json`);
            let targetContent = {};

            // Try to read existing target language file
            try {
                targetContent = await fs.readJson(targetPath);
            } catch (error) {
                console.log(
                    `No existing translations for ${targetLang}! Creating new file...`
                );
            }

            // Get differences between source and target
            const differences = getDifferences(sourceContent, targetContent);

            if (
                Object.keys(differences.missing).length === 0 &&
                differences.obsolete.size === 0
            ) {
                console.log(`No changes needed for ${targetLang}. Skipping...`);
                continue;
            }

            // Log what we're going to do
            console.log(`\nProcessing translations for ${targetLang}...`);
            if (Object.keys(differences.missing).length > 0) {
                console.log('Missing keys:', Object.keys(differences.missing));
            }
            if (differences.obsolete.size > 0) {
                console.log('Obsolete keys:', Array.from(differences.obsolete));
            }

            // Translate missing entries
            if (Object.keys(differences.missing).length > 0) {
                const translatedMissing = await translateObject(
                    differences.missing,
                    targetLang
                );
                _.merge(targetContent, translatedMissing);
            }

            // Remove obsolete entries
            if (differences.obsolete.size > 0) {
                removeObsoleteKeys(targetContent, differences.obsolete);
            }

            // Write updated translations
            await fs.outputJson(targetPath, targetContent, { spaces: 2 });
            console.log(`Updated ${targetLang} translations.`);
        }

        console.log('\nTranslation process completed successfully!');
    } catch (error) {
        console.error('Translation process failed:', error);
        process.exit(1);
    }
}

main();
