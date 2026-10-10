package com.popspot.api.common;

import java.io.IOException;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Security-layer errors in the same problem+json shape as {@code ApiExceptionHandler}, without token details. */
public final class ProblemResponses {

	private ProblemResponses() {
	}

	public static void unauthorized(HttpServletRequest request, HttpServletResponse response, AuthenticationException e) throws IOException {
		write(response, 401, "UNAUTHORIZED", "로그인이 필요합니다.");
	}

	public static void forbidden(HttpServletRequest request, HttpServletResponse response, AccessDeniedException e) throws IOException {
		write(response, 403, "FORBIDDEN", "접근 권한이 없습니다.");
	}

	private static void write(HttpServletResponse response, int status, String code, String detail) throws IOException {
		response.setStatus(status);
		response.setContentType("application/problem+json");
		response.setCharacterEncoding("UTF-8");
		response.getWriter().write("{\"status\":%d,\"code\":\"%s\",\"detail\":\"%s\"}".formatted(status, code, detail));
	}

}
