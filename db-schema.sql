
CREATE TABLE "publisher" (
  "id" uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  "name" character varying(250) NOT NULL,
  "origins" character varying(100)[],
  "created_at" timestamp NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE TABLE "app" (
  "id" uuid DEFAULT uuid_generate_v4() PRIMARY KEY,

  "name" character varying(250) NOT NULL,
  "description" character varying(250) NOT NULL,

  "url" character varying(250) NOT NULL,
  "publisher_id" uuid REFERENCES "publisher" ("id") ON DELETE CASCADE NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),

  "extra" jsonb NOT NULL DEFAULT '{}'::jsonb,
);

/**
 * 'member': only the member can modify the app data (update|delete)
 *  - app_data's member_id matches the id of the member making the request
 * 'item': + other members using the same "app item"
 *  - member making the request can read item with item_id
 * 'app': + other members using other instances of the same app
 *  - member using another "app item" of the same app (same app id/key)
 * 'publisher': + other members using other apps from the same origin/publisher
 *  - member using another "app item" of a different app but of the same publisher (same same publisher id/key)
 *
 * an item admin overrides all of the above - can see/modify everything.
 */
-- CREATE TYPE "app_data_ownership_enum" AS ENUM ('member', 'item', 'app', 'publisher');
/**
 * the same as above
 */
CREATE TYPE "app_data_visibility_enum" AS ENUM ('member', 'item'); --, 'app', 'publisher');

CREATE TABLE "app_data" (
  "id" uuid DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- delete row if member is deleted
  "member_id" uuid REFERENCES "member" ("id") ON DELETE CASCADE NOT NULL,
  -- "session_id" character varying(25), -- TODO: maybe necessary for "public use".

  -- delete row if item is deleted
  "item_id" uuid REFERENCES "item" ("id") ON DELETE CASCADE NOT NULL,

  "data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "type" character varying(25),

  -- don't remove - set creator to NULL
  "creator" uuid REFERENCES "member" ("id") ON DELETE SET NULL,

  -- "ownership" app_data_ownership_enum DEFAULT 'member' NOT NULL,
  "visibility" app_data_visibility_enum DEFAULT 'member' NOT NULL,

  -- TODO: I think this is to discard; maybe item should keep a reference to the appId in its settings?
  -- "app_id" uuid REFERENCES "app" ("id"), -- must be set if ownership != ('member' or 'item')
  -- "publisher_id" uuid REFERENCES "publisher" ("id"), -- must be set if ownership != ('member' or 'item')

  "created_at" timestamp NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
  "updated_at" timestamp NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);
CREATE INDEX "app_data_item_id_idx" ON app_data("item_id");

CREATE TRIGGER "app_data_set_timestamp"
BEFORE UPDATE ON "app_data"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp(); -- "trigger_set_timestamp()" already exists in db

CREATE TABLE "app_action" (
  "id" uuid DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- delete row if member is deleted
  "member_id" uuid REFERENCES "member" ("id") ON DELETE CASCADE NOT NULL,

  -- delete row if item is deleted
  "item_id" uuid REFERENCES "item" ("id") ON DELETE CASCADE NOT NULL,

  "data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "type" character varying(25),

  "created_at" timestamp NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);
CREATE INDEX "app_action_item_id_idx" ON app_action("item_id");
