package com.popspot.api.common;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Error body for every API failure, served as application/problem+json. */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ApiProblem(int status, String code, String detail, List<FieldError> errors) {

	public record FieldError(String field, String message) {
	}

}
