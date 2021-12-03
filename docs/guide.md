# Graasp Apps API Guide

Graasp can embed web applications as a resource. They should be added as an item of type `app` to access the Graasp API and get authenticated with a token.

## Introduction

When an app is added as a resource, it is linked to an item. Therefore, two added apps will correspond to two different items, which leads them to have different item ids, and different app data.

## App Authentication

In order to access the API and get the app token, the apps should fullfil the following requirements:

- be registered as publisher in the database. If you are using our instance, you will need to contact us in order to be added. You will need to provide a `name` and `origin` urls where you will host your applications.
- have an `APP_ID` provided by Graasp. If you are using our instance, you will need to contact us in order for us to generate a valid key you can use.

### Procedure

Here are the steps to request a token:

1. **Request a context**: The app is iframed in the Graasp platform. It can access it's parent window's context by sending a `postMessage`.

```
postMessage(
    JSON.stringify({
      type: 'GET_CONTEXT',
    }
);
```

The response will contain one of the `port` of the `MessageChannel` you will use from now on to communicate with the parent window.

This endpoint is available for any apps, even if you don't fullfil the requirements.

2. **Request a token:** Once you have access to the `MessageChannel`'s `port` you can request a token as follows:

```
port.postMessage(
    JSON.stringify({
      type: 'GET_AUTH_TOKEN',
      payload: {
        app: <app id>,
        origin: <app origin>,
      },
    })
  );
```

The response will contain `token` you will be using to request your app's data.

3. **Use the API**: From now on you can freely use your token to access the API and fetch various data. See the [API Documentation](./api.md).

4. **Refetch the token**: The token might expire. In this case, redo step 2.

****

## React Framework

We are currently working on an app framework, which would provide the token request procedure.
