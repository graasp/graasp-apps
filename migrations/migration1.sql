ALTER TABLE app ADD COLUMN key varchar(50);

UPDATE app SET key = md5(random()::text);
