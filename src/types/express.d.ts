import { AuthUser, OAuthProfile } from './index';

declare global {
	namespace Express {
		interface User extends AuthUser {}
		interface Request {
			user?: AuthUser;
			oauthUser?: OAuthProfile;
		}
	}
}

export {};
