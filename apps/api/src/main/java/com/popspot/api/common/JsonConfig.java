package com.popspot.api.common;

import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;
import tools.jackson.databind.exc.InvalidFormatException;
import tools.jackson.databind.module.SimpleModule;

@Configuration
class JsonConfig {

	/**
	 * Instants must carry an explicit offset ("2026-10-20T14:00:00+09:00"). The default deserializer also accepts local
	 * date-times and silently treats them as UTC, which would shift a KST input by nine hours.
	 */
	@Bean
	SimpleModule strictOffsetDateTime() {
		return new SimpleModule().addDeserializer(OffsetDateTime.class, new ValueDeserializer<>() {
			@Override
			public OffsetDateTime deserialize(JsonParser p, DeserializationContext ctxt) {
				String text = p.getValueAsString();
				try {
					return OffsetDateTime.parse(text);
				}
				catch (DateTimeParseException | NullPointerException e) {
					throw InvalidFormatException.from(p, "Offset is required", text, OffsetDateTime.class);
				}
			}
		});
	}

}
