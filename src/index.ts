// Imports
import { Request } from 'express';
import OAuth2Strategy = require('passport-oauth2');

// Create a new class that extends OAuth2Strategy
const InternalOAuthError = OAuth2Strategy.InternalOAuthError;

/**
 * `YahooOauthTokenStrategy` constructor.
 *
 * The Yahoo authentication strategy authenticates requests by delegating to
 * Yahoo using the OAuth 2.0 protocol.
 *
 * Applications must supply a `verify` callback which accepts an `accessToken`,
 * `refreshToken` and service-specific `profile`, and then calls the `cb`
 * callback supplying a `user`, which should be set to `false` if the
 * credentials are not valid.  If an exception occurred, `err` should be set.
 *
 * @param {Object} options
 * @param {Function} verify
 * @example
 * passport.use(new YahooOauthTokenStrategy(
 *   {
 *     clientID: '123456789',
 *     clientSecret: 'abcxyz',
 *   },
 *   (accessToken, refreshToken, profile, cb) => {
 *     User.findOrCreate({ yahooId: profile.id }, cb);
 *   }
 * );
 */
// Types
type TStrategyOptions = OAuth2Strategy.StrategyOptions;
type TConstructorOptions = Pick<TStrategyOptions, 'clientID' | 'clientSecret'> &
	Partial<Omit<TStrategyOptions, 'clientID' | 'clientSecret'>> & {
		profileURL?: string;
		accessTokenField?: string;
		refreshTokenField?: string;
		accessCodeField?: string;
	};
type TYahooProfile = {
	birthdate?: string;
	email: string;
	email_verified?: boolean;
	family_name?: string;
	gender?: string;
	given_name?: string;
	locale?: string;
	name: string;
	nickname?: string;
	picture?: string;
	profile_images?: {
		[size: string]: string;
	};
	sub: string;
};

type TParsedProfile = TYahooProfile & {
	provider: string;
	id: string;
	photos?: {
		type: string;
		value: string;
	}[];
	_json: any;
	_raw?: any;
};

export default class YahooOauthTokenStrategy extends OAuth2Strategy {
	[x: string]: any;
	private _profileURL: string;
	private _accessTokenField: string;
	private _refreshTokenField: string;
	private _accessCodeField: string;
	private _passReqToCallback: boolean;

	constructor(options: TConstructorOptions, verify: OAuth2Strategy.VerifyFunction) {
		// Append default options
		const preparedOptions: TStrategyOptions = {
			...options,
			tokenURL: options.tokenURL ?? `https://api.login.yahoo.com/oauth2/get_token`,
			authorizationURL: options.authorizationURL ?? `https://api.login.yahoo.com/oauth2/request_auth`,
		};

		// Call parent constructor
		super(preparedOptions, verify);

		// Set name
		this.name = 'yahoo-oauth-token';

		// Set profile URL
		this._profileURL = options.profileURL || `https://api.login.yahoo.com/openid/v1/userinfo`;

		// Set access token field and passReqToCallback
		this._accessTokenField = options.accessTokenField || 'access_token';
		this._accessCodeField = options.accessCodeField || 'code';
		this._refreshTokenField = options.refreshTokenField || 'refresh_token';
		this._passReqToCallback = options.passReqToCallback ?? false;

		// Set OAuth2 options
		this._oauth2.useAuthorizationHeaderforGET(true);
	}

	/**
	 * Authenticate request by delegating to a service provider using OAuth 2.0.
	 * @param {Object} req
	 * @param {Object} _options
	 */
	authenticate(req: Request, _options: unknown) {
		const accessCode = this.lookup(req, this._accessCodeField);
		const accessToken = this.lookup(req, this._accessTokenField);
		const refreshToken = this.lookup(req, this._refreshTokenField);

		if (!accessCode && !accessToken)
			return this.fail({ message: `You should provide ${this._accessCodeField} or ${this._accessTokenField}` });

		if (!accessToken) {
			// If no access token is present, try to obtain an access token using an authorization code.
			this._oauth2.getOAuthAccessToken(
				accessCode,
				{
					grant_type: 'authorization_code',
					redirect_uri: 'oob', // Ignore redirect uri
				},
				(error, accessTokenExchanged, refreshTokenExchanged, _results) => {
					if (error) return this.error(error);
					if (!accessTokenExchanged)
						return this.fail({ message: `Error exchanging authorization code for access token` });

					// Call user profile
					this._returnUserProfile(accessTokenExchanged, refreshTokenExchanged ?? refreshToken, req);
				},
			);
		} else {
			// Call user profile
			this._returnUserProfile(accessToken, refreshToken, req);
		}
	}
	private _returnUserProfile(accessToken: string, refreshToken: string | undefined, req: Request) {
		// Load user profile
		this._loadUserProfile(accessToken, (errorUserProfile: any, profile: any) => {
			if (errorUserProfile) return this.error(errorUserProfile);

			const verified = (error: any, user: Express.User, info: object | undefined) => {
				if (error) return this.error(error);
				if (!user) return this.fail(info);

				return this.success(user, info);
			};

			if (this._passReqToCallback) {
				this._verify(req, accessToken, refreshToken, profile, verified);
			} else {
				this._verify(accessToken, refreshToken, profile, verified);
			}
		});
	}

	/**
	 * Retrieve user profile from Yahoo.
	 *
	 * This function constructs a normalized profile, with the following properties:
	 *
	 *   - `provider`         always set to `yahoo`
	 *   - `id`               the user's Yahoo ID
	 *   - `username`         the user's Yahoo username
	 *   - `name`      the user's full name
	 *
	 * @param {String} accessToken
	 * @param {Function} done
	 */
	userProfile(
		accessToken: string,
		done: (error: Error | null | undefined, profile?: TParsedProfile | undefined) => void,
	) {
		this._oauth2.get(this._profileURL, accessToken, (error, body, _res) => {
			if (error) {
				return done(new InternalOAuthError('Failed to fetch user profile', error));
			}

			try {
				const json: TYahooProfile = typeof body === 'string' ? JSON.parse(body) : body;

				const profile = YahooOauthTokenStrategy.parseProfile(json);
				profile._raw = body;

				done(null, profile);
			} catch (e) {
				done(e as Error);
			}
		});
	}

	/**
	 * This method handles searhing the value of provided field in body, query, and header.
	 *
	 * @param {Object} req http request object
	 * @param {String} field
	 * @returns {String} field's value in body, query, or headers
	 */
	lookup(req: Request, field: string): string {
		return (req.body && req.body[field]) || (req.query && req.query[field]) || (req.headers && req.headers[field]);
	}

	/**
	 * Parse profile.
	 *
	 * Parses user profiles as fetched from Yahoo's OpenID Connect-compatible user
	 * info endpoint.
	 *
	 * The amount of detail in the profile varies based on the scopes granted by the
	 * user. The following scope values add additional data:
	 *
	 *     `profile` - basic profile information
	 *     `email` - email address
	 *
	 * References:
	 *   - https://developer.yahoo.com/sign-in-with-yahoo/#node-step-four
	 *
	 * @param {object} json
	 * @return {TParsedProfile}
	 */

	static parseProfile(json: TYahooProfile): TParsedProfile {
		const profile: TParsedProfile = {
			...json,
			provider: 'yahoo',
			id: json.sub,
			email: json.email || '',
			_json: json,
		};

		if (json.profile_images) {
			profile.photos = Object.entries(json.profile_images).map(([type, value]) => ({
				type,
				value,
			}));
		}

		return profile;
	}
}
