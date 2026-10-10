package com.popspot.api.admin;

import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import tools.jackson.databind.json.JsonMapper;

/** Append-only record of operator changes. Detail holds identifiers and changed values, never customer contact data. */
@Component
public class AuditLog {

	private final JdbcClient jdbc;

	private final JsonMapper json;

	AuditLog(JdbcClient jdbc, JsonMapper json) {
		this.jdbc = jdbc;
		this.json = json;
	}

	public void record(UUID actor, String action, String targetType, Object targetId, Map<String, ?> detail) {
		jdbc.sql("insert into audit_logs (actor_id, action, target_type, target_id, detail) values (?, ?, ?, ?, cast(? as jsonb))")
			.params(actor, action, targetType, String.valueOf(targetId), json.writeValueAsString(detail))
			.update();
	}

}
