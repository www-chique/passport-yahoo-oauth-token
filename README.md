# passport-yahoo-oauth-token

[Passport](http://passportjs.org/) strategy for authenticating with [Yahoo](https://developer.yahoo.com/sign-in-with-yahoo/)
access tokens (or better authorization code) using the OAuth 2.0 API.

This module is inspired by [passport-google-oauth-token](https://github.com/zgid123/passport-google-oauth-token).

This module lets you authenticate using Yahoo "Access Code" / "Authorization Code" in your Node.js applications. Since Yahoo does not provide access token directly, this module takes the authorization code from the client login flow, and exchanges it for access token, subsequently returning the user's profile data.

By plugging into Passport, Yahoo authentication can be easily and
unobtrusively integrated into any application or framework that supports
[Connect](http://www.senchalabs.org/connect/)-style middleware, including
[Express](http://expressjs.com/).

## Installation

    $ npm install passport-yahoo-oauth-token

## Usage

### Configure Strategy

The Yahoo authentication strategy authenticates users using a Yahoo
account and OAuth 2.0 tokens. The strategy requires a `verify` callback, which
accepts these credentials and calls `cb` providing a user, as well as
`options` specifying an app ID and app secret.

```js
const YahooOauthTokenStrategy = require('passport-yahoo-oauth-token');
// import YahooOauthTokenStrategy from 'passport-yahoo-oauth-token';

passport.use(
	new YahooOauthTokenStrategy(
		{
			clientID: YAHOO_CLIENT_ID,
			clientSecret: YAHOO_CLIENT_SECRET,
		},
		(accessToken, refreshToken, profile, cb) => {
			User.findOrCreate({ yahooId: profile.id }, (error, user) => {
				return done(error, user);
			});
		},
	),
);
```

### Authenticate Requests

Use `passport.authenticate()`, specifying the `'yahoo-oauth-token'` strategy, to authenticate requests.

```js
app.post('/auth/yahoo/token', passport.authenticate('yahoo-oauth-token'), (req, res) => {
	// do something with req.user
	res.send(req.user ? 200 : 401);
});
```

### Client Requests

Clients can send requests to routes that use passport-yahoo-oauth-token authentication using `query parms`, `body`, or `HTTP headers`. Clients will need to transmit the `access_token`, which is the Authorization Code provided by yahoo api when client successfully logs in and approves the app.

## Options

| Field            | Description                      | Default Value                                   |
| ---------------- | -------------------------------- | ----------------------------------------------- |
| clientID         | Yahoo's client id                |                                                 |
| clientSecret     | Yahoo's client secret            |                                                 |
| tokenURL         | Yahoo's oauth2 token url         | https://api.login.yahoo.com/oauth2/request_auth |
| profileURL       | Yahoo's scope profile url        | https://api.login.yahoo.com/openid/v1/userinfo  |
| authorizationURL | Yahoo's oauth2 authorization url | https://api.login.yahoo.com/oauth2/get_token    |

## Profile Example

```js
{
	birthdate: "xxxx",
	email: "xxxx@yahoo.com",
	email_verified: true,
	family_name: "xxxx",
	gender: "xxxx",
	given_name: "xxxx",
	locale: "en-US",
	name: "xxxx",
	nickname: "xxxx",
	picture: "https://s.yimg.com/ag/images/default_user_profile_pic_192sq.jpg",
	profile_images:   {
		image128: "https://s.yimg.com/ag/images/default_user_profile_pic_128sq.jpg",
		image192: "https://s.yimg.com/ag/images/default_user_profile_pic_192sq.jpg",
		image32: "https://s.yimg.com/ag/images/default_user_profile_pic_32sq.jpg",
		image64: "https://s.yimg.com/ag/images/default_user_profile_pic_64sq.jpg",
	},
	sub: "xxxx",
	_json: {},
	_raw: {},
}
```

## License

The MIT License (MIT)

Copyright (c) 2015 Nicholas Penree

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
