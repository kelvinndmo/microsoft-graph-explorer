// ------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation.  All Rights Reserved.  Licensed under the MIT License.
//  See License in the project root for license information.
// ------------------------------------------------------------------------------

import { ChangeDetectorRef } from '@angular/core';
import { AppComponent } from '../app.component';
import { IExplorerOptions, IMessage } from '../base';
import { GraphService } from '../graph-service';
import { PermissionScopes } from '../scopes-dialog/scopes';
import { getParameterByName } from '../util';
import { AuthService } from './auth.service';

export function initAuth(options: IExplorerOptions, apiService: GraphService, changeDetectorRef: ChangeDetectorRef,
                         authService: AuthService) {
    setInterval(refreshAccessToken, 1000 * 60 * 10); // Refresh access token every 10 minutes
    hello.init({
    msft: {
      oauth: {
        version: 2,
        auth: options.AuthUrl + '/common/oauth2/v2.0/authorize',
        grant: options.AuthUrl + '/common/oauth2/v2.0/token',
      },
      scope_delim: ' ',

      // Don't even try submitting via form.
      // This means no POST operations in <=IE9
      form: false,
    },
    msft_admin_consent: {
      oauth: {
        version: 2,
        auth: options.AuthUrl + '/common/adminconsent',
        grant: options.AuthUrl + '/common/oauth2/v2.0/token',
      },
      scope_delim: ' ',

      // Don't even try submitting via form.
      // This means no POST operations in <=IE9
      form: false,
    },
  } as any);

    hello.init({
    msft: options.ClientId,
    msft_admin_consent: options.ClientId,
  }, {
      redirect_uri: window.location.pathname, // Required to remove extra url params that make URLs not match
    });

    hello.on('auth.login', (auth) => {
    let accessToken;

    if (auth.network === 'msft') {
      const authResponse = hello('msft').getAuthResponse();

      accessToken = authResponse.access_token;
    }

    if (accessToken) {
      AppComponent.explorerValues.authentication.status = 'authenticating';
      changeDetectorRef.detectChanges();

      const promisesGetUserInfo = [];
      AppComponent.explorerValues.authentication.user = {};

      // Get displayName and email
      promisesGetUserInfo.push(apiService
        .performQuery('GET', `${AppComponent.Options.GraphUrl}/v1.0/me`)
        .then((result) => {
          const resultBody = result.json();
          AppComponent.explorerValues.authentication.user.displayName = resultBody.displayName;
          AppComponent.explorerValues.authentication.user.emailAddress = resultBody.mail
          || resultBody.userPrincipalName;
      }));

      // Get profile image
      promisesGetUserInfo.push(apiService
        .performQuery('GET_BINARY', `${AppComponent.Options.GraphUrl}/beta/me/photo/$value`)
        .then((result) => {
          const blob = new Blob([result.arrayBuffer()], { type: 'image/jpeg' });
          const imageUrl = window.URL.createObjectURL(blob);
          AppComponent.explorerValues.authentication.user.profileImageUrl = imageUrl;
      }));

      Promise.all(promisesGetUserInfo).then(() => {
        AppComponent.explorerValues.authentication.status = 'authenticated';
        changeDetectorRef.detectChanges();
      }).catch((e) => {
        // Occurs when hello got an access token, but it's already expired
        localLogout();
      });

      // Set which permissions are checked

      const scopes = getScopes();
      scopes.push('openid');
      for (const scope of PermissionScopes) {
        scope.enabled = scope.enabledTarget = scopes.indexOf(scope.name.toLowerCase()) !== -1;
      }
    }
  });
    AppComponent.explorerValues.authentication.status =
  haveValidAccessToken(authService) ? 'authenticating' : 'anonymous';
    handleAdminConsentResponse();
}

export function refreshAccessToken() {
  if (AppComponent.explorerValues.authentication.status !== 'authenticated') {
    return;
  }

/*   const loginProperties = {
    display: 'none',
    response_type: 'token',
    response_mode: 'fragment',
    nonce: 'graph_explorer',
    prompt: 'none',
    scope: AppComponent.Options.DefaultUserScopes,
    login_hint: AppComponent.explorerValues.authentication.user.emailAddress,
    domain_hint: 'organizations',
  };
 */
  // Hellojs might have a bug with their types for .login()
  // Https://github.com/MrSwitch/hello.js/issues/514

  // Const silentLoginRequest: Promise<void> = hello('msft').login(loginProperties) as any;
}

function handleAdminConsentResponse() {
  const adminConsentRes = hello('msft_admin_consent').getAuthResponse();

  const successMsg: IMessage = {
    body: 'You have completed the admin consent flow and can now select permission scopes that require' +
    ' administrator consent.  It may take a few minutes before the consent takes effect.',
    title: 'Admin consent completed',
  };

  if (getParameterByName('admin_consent')) {
    if (adminConsentRes) {
      const error = adminConsentRes.error_description;
      if (error) {
        AppComponent.setMessage({
          body: error,
          title: 'Admin consent error',
        });

      } else {
        AppComponent.setMessage(successMsg);
      }
    } else {
      AppComponent.setMessage(successMsg);
    }
  }
}

// Warning - doesn't include 'openid' scope

// After authentication redirect back to explorer, the obtained scopes need to be parsed
// Issue - Depending on conditions (account type, initial or incremental consent), the
// Scopes might have different delimiters - ' ', '+', ','
export function getScopes() {
  let scopesStr = hello('msft').getAuthResponse().scope;

  // ScopesStr is something like 'Files.Read,Mail.Send,User.Read'
  if (!scopesStr) {
    return;
  }

  scopesStr = scopesStr.toLowerCase();

  if (scopesStr.indexOf('+') !== -1) {
    return scopesStr.split('+');
  } else if (scopesStr.indexOf(',') !== -1) {
    return scopesStr.split(',');
  } else if (scopesStr.split(' ').length > 2) {
    return scopesStr.split(' ');
  }
}

export async function haveValidAccessToken(authService) {

  const token = await authService.getToken();
  if (token) {
    return true;
  }
  return false;
}

(window as any).tokenPlease = () => {
  const authResponse = hello('msft').getAuthResponse();
  if (authResponse) {
    return authResponse.access_token;
  }
};

export function localLogout() {
  // Anonymous users can only GET
  AppComponent.explorerValues.selectedOption = 'GET';
  AppComponent.explorerValues.authentication.user = {};
  localStorage.setItem('status', 'anonymous');
}

export function checkHasValidAuthToken(authService) {
  if (!haveValidAccessToken(authService) && isAuthenticated()) {
    localLogout();
  }
}

export function isAuthenticated() {
  const status = localStorage.getItem('status');
  if (status && status !== 'anonymous') {
      return true;
    }
  return false;
}