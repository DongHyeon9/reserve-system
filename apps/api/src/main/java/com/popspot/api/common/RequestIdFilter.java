package com.popspot.api.common;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Correlates one request across Next.js and Spring logs. Accepts a well-formed X-Request-Id from the caller (the Next
 * server), otherwise generates one, echoes it back, and puts it on every log line via MDC. Logs only method, route,
 * status and duration for 5xx or slow requests: never query strings, headers, or bodies (tokens, contact data).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter extends OncePerRequestFilter {

	public static final String HEADER = "X-Request-Id";

	static final long SLOW_MS = 1000;

	private static final Pattern VALID = Pattern.compile("[A-Za-z0-9-]{8,64}");

	private static final Logger log = LoggerFactory.getLogger("popspot.request");

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		String incoming = request.getHeader(HEADER);
		String requestId = incoming != null && VALID.matcher(incoming).matches() ? incoming : UUID.randomUUID().toString();
		long started = System.nanoTime();
		MDC.put("requestId", requestId);
		response.setHeader(HEADER, requestId);
		try {
			chain.doFilter(request, response);
		}
		finally {
			long ms = (System.nanoTime() - started) / 1_000_000;
			int status = response.getStatus();
			if (status >= 500 || ms >= SLOW_MS) {
				log.atWarn()
					.addKeyValue("event", status >= 500 ? "http_server_error" : "http_slow_request")
					.addKeyValue("method", request.getMethod())
					.addKeyValue("path", request.getRequestURI())
					.addKeyValue("status", status)
					.addKeyValue("durationMs", ms)
					.log("{} {} -> {} in {}ms", request.getMethod(), request.getRequestURI(), status, ms);
			}
			MDC.remove("requestId");
		}
	}

}
