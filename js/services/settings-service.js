/**
 * Settings Service for Appwrite main-2 database
 * 
 * Handles user/project-level settings such as dev_mode and onboarding flags.
 */

const settingsDebug = {
    info: (msg, data) => console.log(`⚙️ SETTINGS_SERVICE: ${msg}`, data || ''),
    error: (msg, error) => console.error(`❌ SETTINGS_SERVICE ERROR: ${msg}`, error),
    warn: (msg, data) => console.warn(`⚠️ SETTINGS_SERVICE: ${msg}`, data || ''),
    step: (msg) => console.log(`👉 SETTINGS_SERVICE: ${msg}`),
    done: (msg) => console.log(`✅ SETTINGS_SERVICE: ${msg || 'Operation completed'}`)
};

// Save or update settings for the current project/user
async function saveSettings(settingsData) {
    settingsDebug.start('Saving settings to Appwrite');

    if (!window.APPWRITE_CONFIG?.databases?.main2) {
        throw new Error('Settings database (main-2) not configured');
    }

    const databaseId = window.APPWRITE_CONFIG.databases.main2;
    const collectionId = 'settings'; // as per current database_schema.md

    try {
        if (!window.appwriteDatabasesMain2) {
            throw new Error('Appwrite main-2 database service not available');
        }

        const databases = window.appwriteDatabasesMain2;

        settingsDebug.step('Preparing settings payload');
        const settingsToSave = {
            dev_mode: settingsData.dev_mode || false,
            onboarding: settingsData.onboarding || false,
            $updatedAt: new Date().toISOString()
        };

        let savedSettings;
        if (settingsData.dbId) {
            settingsDebug.step('Updating existing settings document');
            savedSettings = await databases.updateDocument(
                databaseId,
                collectionId,
                settingsData.dbId,
                settingsToSave
            );
            settingsDebug.info(`Settings updated: ${savedSettings.$id}`);
        } else {
            settingsDebug.step('Creating new settings document');
            savedSettings = await databases.createDocument(
                databaseId,
                collectionId,
                Appwrite.ID.unique(),
                settingsToSave,
                [Appwrite.Permission.read('any'), Appwrite.Permission.update('any')]
            );
            settingsDebug.info(`New settings created: ${savedSettings.$id}`);
        }

        settingsDebug.done('Settings saved successfully');
        return {
            success: true,
            settings: {
                dbId: savedSettings.$id,
                dev_mode: savedSettings.dev_mode,
                onboarding: savedSettings.onboarding,
                updatedAt: savedSettings.$updatedAt
            }
        };
    } catch (error) {
        settingsDebug.error('Failed to save settings', error);
        throw new Error(`Failed to save settings: ${error.message}`);
    }
}

// Load settings for current project/user
async function loadSettings() {
    settingsDebug.start('Loading settings from Appwrite');

    if (!window.APPWRITE_CONFIG?.databases?.main2) {
        throw new Error('Settings database (main-2) not configured');
    }

    const databaseId = window.APPWRITE_CONFIG.databases.main2;
    const collectionId = 'settings';

    try {
        if (!window.appwriteDatabasesMain2) {
            throw new Error('Appwrite main-2 database service not available');
        }

        const databases = window.appwriteDatabasesMain2;
        const response = await databases.listDocuments(databaseId, collectionId);

        if (!response.documents || response.documents.length === 0) {
            settingsDebug.warn('No settings document found');
            return null;
        }

        const settingsDoc = response.documents[0];
        settingsDebug.done('Settings loaded successfully');
        return {
            dbId: settingsDoc.$id,
            dev_mode: settingsDoc.dev_mode || false,
            onboarding: settingsDoc.onboarding || false,
            updatedAt: settingsDoc.$updatedAt
        };
    } catch (error) {
        settingsDebug.error('Failed to load settings', error);
        throw new Error(`Failed to load settings: ${error.message}`);
    }
}

// Export globally
window.settingsService = {
    saveSettings,
    loadSettings
};

settingsDebug.info('Settings service module loaded and ready');
