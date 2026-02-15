import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as AppleStrategy } from 'passport-apple';
import { config } from '@/config';
import { OAuthProfile } from '@/types';
import fs from 'fs';

/**
 * Configure Google OAuth Strategy
 */
if (config.features.oauthGoogle && config.oauth.google.clientId) {
	passport.use(
		new GoogleStrategy(
			{
				clientID: config.oauth.google.clientId,
				clientSecret: config.oauth.google.clientSecret,
				callbackURL: config.oauth.google.callbackUrl,
				scope: ['profile', 'email'],
			},
			(accessToken, refreshToken, profile, done) => {
				const oauthProfile: OAuthProfile = {
					provider: 'google',
					providerId: profile.id,
					email: profile.emails?.[0]?.value || '',
					displayName: profile.displayName,
					avatarUrl: profile.photos?.[0]?.value,
					accessToken,
					refreshToken,
				};
				done(null, oauthProfile);
			},
		),
	);
}

/**
 * Configure Facebook OAuth Strategy
 */
if (config.features.oauthFacebook && config.oauth.facebook.appId) {
	passport.use(
		new FacebookStrategy(
			{
				clientID: config.oauth.facebook.appId,
				clientSecret: config.oauth.facebook.appSecret,
				callbackURL: config.oauth.facebook.callbackUrl,
				profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
			},
			(accessToken, refreshToken, profile, done) => {
				const oauthProfile: OAuthProfile = {
					provider: 'facebook',
					providerId: profile.id,
					email: profile.emails?.[0]?.value || '',
					displayName:
						`${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim(),
					avatarUrl: profile.photos?.[0]?.value,
					accessToken,
					refreshToken,
				};
				done(null, oauthProfile);
			},
		),
	);
}

/**
 * Configure Apple OAuth Strategy
 */
if (config.features.oauthApple && config.oauth.apple.clientId) {
	let privateKey: string | undefined;

	try {
		if (fs.existsSync(config.oauth.apple.privateKeyPath)) {
			privateKey = fs.readFileSync(config.oauth.apple.privateKeyPath, 'utf8');
		}
	} catch (error) {
		console.warn('Apple private key not found, Apple OAuth will not work');
	}

	if (privateKey) {
		passport.use(
			new AppleStrategy(
				{
					clientID: config.oauth.apple.clientId,
					teamID: config.oauth.apple.teamId,
					keyID: config.oauth.apple.keyId,
					privateKeyString: privateKey,
					callbackURL: config.oauth.apple.callbackUrl,
					scope: ['name', 'email'],
				},
				(accessToken, refreshToken, idToken, profile, done) => {
					const oauthProfile: OAuthProfile = {
						provider: 'apple',
						providerId: profile.id,
						email: profile.email || '',
						displayName: profile.name
							? `${profile.name.firstName || ''} ${profile.name.lastName || ''}`.trim()
							: undefined,
						accessToken,
						refreshToken,
					};
					done(null, oauthProfile);
				},
			),
		);
	}
}

/**
 * Serialize user for session (not used with JWT, but required by Passport)
 */
passport.serializeUser((user, done) => {
	done(null, user);
});

/**
 * Deserialize user from session (not used with JWT, but required by Passport)
 */
passport.deserializeUser((user: any, done) => {
	done(null, user);
});

export default passport;
