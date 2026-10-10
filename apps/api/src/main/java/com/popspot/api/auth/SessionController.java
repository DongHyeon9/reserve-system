package com.popspot.api.auth;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class SessionController {

	record Session(UUID id, String email, List<String> roles) {
		static Session of(JwtAuthenticationToken auth) {
			var roles = auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).map(a -> a.substring("ROLE_".length())).toList();
			return new Session(UUID.fromString(auth.getName()), auth.getToken().getClaimAsString("email"), roles);
		}
	}

	@GetMapping("/api/me")
	Session me(JwtAuthenticationToken auth) {
		return Session.of(auth);
	}

	/** Used by the Next.js admin route guard; Spring is the source of truth for admin access. */
	@GetMapping("/api/admin/session")
	Session adminSession(JwtAuthenticationToken auth) {
		return Session.of(auth);
	}

}
