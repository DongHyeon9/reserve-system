package com.popspot.api.auth;

import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class UserAccounts {

	private final JdbcClient jdbc;

	UserAccounts(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	/** First authenticated request provisions the account as CUSTOMER. Elevated roles are granted only in the DB. */
	// ponytail: two upserts per request; cache roles per token if auth becomes a hotspot.
	@Transactional
	public List<String> ensureAndLoadRoles(UUID id, String email) {
		jdbc.sql("insert into app_users (id, email) values (?, ?) on conflict (id) do nothing")
			.params(id, email == null ? "" : email)
			.update();
		jdbc.sql("insert into user_roles (user_id, role) values (?, 'CUSTOMER') on conflict do nothing").param(id).update();
		return jdbc.sql("select role from user_roles where user_id = ? order by role").param(id).query(String.class).list();
	}

}
