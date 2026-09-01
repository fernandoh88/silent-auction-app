const admin = require('firebase-admin');

function normalizePrivateKey(privateKey) {
  return privateKey.replace(/\\n/g, '\n');
}

function getEnvServiceAccount() {
  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ];
  const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);

  if (missingEnvVars.length === requiredEnvVars.length) {
    return null;
  }

  if (missingEnvVars.length > 0) {
    throw new Error(`Firebase Admin credentials are incomplete. Missing: ${missingEnvVars.join(', ')}`);
  }

  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
    throw new Error('Firebase Admin private key is not a valid PEM private key');
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  };
}

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  const envServiceAccount = getEnvServiceAccount();
  if (envServiceAccount) {
    return envServiceAccount;
  }

  if (process.env.NODE_ENV !== 'production') {
    return require('./serviceAccountKey.json');
  }

  throw new Error('Firebase Admin credentials are not configured');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount()),
  });
}

module.exports = admin.auth();
