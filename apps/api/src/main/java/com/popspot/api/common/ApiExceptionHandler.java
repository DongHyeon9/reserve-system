package com.popspot.api.common;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
class ApiExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

	private static final MediaType PROBLEM = MediaType.APPLICATION_PROBLEM_JSON;

	@ExceptionHandler(ApiException.class)
	ResponseEntity<ApiProblem> api(ApiException e) {
		if (e.status() == HttpStatus.CONFLICT) {
			// Business conflicts (sold out, duplicate, not open...) feed the conflict-rate metric. Code only, no request data.
			log.atInfo().addKeyValue("event", "business_conflict").addKeyValue("code", e.code()).log("Business conflict {}", e.code());
		}
		return problem(e.status(), e.code(), e.getMessage(), List.of());
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<ApiProblem> invalidBody(MethodArgumentNotValidException e) {
		var errors = e.getBindingResult().getFieldErrors().stream()
			.map(f -> new ApiProblem.FieldError(f.getField(), f.getDefaultMessage()))
			.toList();
		return problem(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "입력값을 확인해 주세요.", errors);
	}

	@ExceptionHandler(HandlerMethodValidationException.class)
	ResponseEntity<ApiProblem> invalidParams(HandlerMethodValidationException e) {
		var errors = e.getParameterValidationResults().stream()
			.flatMap(r -> r.getResolvableErrors().stream()
				.map(err -> new ApiProblem.FieldError(r.getMethodParameter().getParameterName(), err.getDefaultMessage())))
			.toList();
		return problem(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "입력값을 확인해 주세요.", errors);
	}

	@ExceptionHandler({ HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class })
	ResponseEntity<ApiProblem> unreadable(Exception e) {
		return problem(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "요청 형식이 올바르지 않습니다.", List.of());
	}

	@ExceptionHandler(MissingRequestHeaderException.class)
	ResponseEntity<ApiProblem> missingHeader(MissingRequestHeaderException e) {
		return problem(HttpStatus.BAD_REQUEST, "HEADER_REQUIRED", e.getHeaderName() + " 헤더가 필요합니다.", List.of());
	}

	@ExceptionHandler(NoResourceFoundException.class)
	ResponseEntity<ApiProblem> noResource(NoResourceFoundException e) {
		return problem(HttpStatus.NOT_FOUND, "NOT_FOUND", "요청한 정보를 찾을 수 없습니다.", List.of());
	}

	@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
	ResponseEntity<ApiProblem> method(HttpRequestMethodNotSupportedException e) {
		return problem(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", "지원하지 않는 요청입니다.", List.of());
	}

	@ExceptionHandler(Exception.class)
	ResponseEntity<ApiProblem> unexpected(Exception e) {
		// Exception messages and causes can carry SQL values or personal data (e.g. constraint details), so production
		// logs get class names only. Full detail is available at DEBUG for local diagnosis.
		Throwable root = e;
		while (root.getCause() != null && root.getCause() != root) {
			root = root.getCause();
		}
		log.error("Unhandled API error: {} (root cause: {})", e.getClass().getName(), root.getClass().getName());
		log.debug("Unhandled API error detail", e);
		return problem(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "일시적인 오류가 발생했습니다.", List.of());
	}

	private static ResponseEntity<ApiProblem> problem(HttpStatus status, String code, String detail, List<ApiProblem.FieldError> errors) {
		return ResponseEntity.status(status).contentType(PROBLEM).body(new ApiProblem(status.value(), code, detail, errors));
	}

}
