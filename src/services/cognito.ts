import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { COGNITO_CLIENT_ID, COGNITO_USER_POOL_ID } from '../constants/config';
import { secureTokenStorage } from './secureStorage';

/**
 * Set up Amplify Auth once, before anything signs in. Imported for its side effect
 * by the root layout. Tokens go to secure storage (see secureStorage.ts).
 */
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: COGNITO_USER_POOL_ID,
      userPoolClientId: COGNITO_CLIENT_ID,
    },
  },
});

cognitoUserPoolsTokenProvider.setKeyValueStorage(secureTokenStorage);
