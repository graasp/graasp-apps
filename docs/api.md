# API

All following requests need an authentication token receive as describe in the [guide](./guide.md). 

Therefore, don't forget to use `Authorization: Bearer <token>` in your request's headers.

**Table of Contents**
- [App Action](#app-action)
- [App Context](#app-context)
- [App Data](#app-data)
- [Parent Window](#parent-window)


<a name="app-action"></a>
## App Actions

App actions are analytic traces the app might save. They have the following structure:

- `id`: the app action id
- `memberId`: the member id related to the app action (default: current authenticated member id)
- `itemId`: the item id corresponding to the current app
- `data`: object containing any necessary data
- `type`: the related action related to the data
- `createdAt`: creation timestamp of the app action

### GET App Action

`GET <apiHost>/app-items/<item-id>/app-action`

- return value: an array of all app data related to `itemId`


### GET App Action for multiple items

`TODO`

### POST App Action

`POST <apiHost>/app-items/<item-id>/app-action`

- body: `{ data: { ... }, type, [memberId], [visibility] }`
- returned value: added app data


****
<a name="app-data"></a>
## App Data

App data are all data the app might save. They have the following structure:

- `id`: the app data id
- `memberId`: the member id related to the data (default: current authenticated member id)
- `itemId`: the item id corresponding to the current app
- `data`: object containing any necessary data
- `type`: the related action related to the data
- `creator`: the member id who created the item
- `visibility`: availability of the app data, either `member` or `item` (default: `member`)
- `createdAt`: creation timestamp of the app data
- `updatedAt`: update timestamp of the app data

### GET App Data

`GET <apiHost>/app-items/<item-id>/app-data`

- return value: an array of all app data related to `itemId`


### GET App Data for multiple items

`TODO`

### POST App Data

`POST <apiHost>/app-items/<item-id>/app-data`

- body: `{ data: { ... }, type, [memberId], [visibility] }`
- returned value: added app data

### PATCH App Data

`PATCH <apiHost>/app-items/<item-id>/app-data/<app-data-id>`

- body: `{ data: { ... } }`
- returned value: patched app data


### DELETE App Data

`DELETE <apiHost>/app-items/<item-id>/app-data/<app-data-id>`

- returned value: deleted app data

****

<a name="app-context"></a>
## App Context

The app context contains additional information which might be interesting for you app such as:

- `members`: a list of all the members having access to this item
- `children`: all children items contained in the app item
- and all the item's properties such as `ìd`, `name`, `description`, etc 

### GET App Action

`GET <apiHost>/app-items/<item-id>/context`

- return value: the context of the corresponding item


****

<a name="app-context"></a>
## Parent Window

Since apps are embedded in Graasp with an iframe, it is possible to communicate with the parent window using both regular `window.postMessage` and `MessageChannel`. One should first use `window.postMessage` to get the context, as well as the `MessageChannel`'s port to continue the process (see [guide](./guide.md)).

### `window.postMessage`

### GET Context

```
postMessage(
    JSON.stringify({
      type: 'GET_CONTEXT',
    }
);
```
- return values:
    - `itemId`: item id which corresponds to your app resource id
    - `userId`: the current authenticated user using the app
    - `apiHost`: the api host origin
    - `mode`: the mode the app is running on
    - as well as the `port` of the `MessageChannel` you will use from now on to communicate with the parent window.

### `MessageChannel`

### GET Authentication Token

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
- return value: authentication token

### GET App Item Settings

`TODO`

### PATCH App Item Settings

`TODO`
