UPDATE `posts` SET `published_at` = `published_at` + 43200 WHERE `published_at` % 86400 = 0;
