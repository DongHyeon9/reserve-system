package com.popspot.api.auth;

import java.util.UUID;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/** Maps a verified token to server-managed roles; role claims inside the token are ignored. */
@Component
class RoleJwtConverter implements Converter<Jwt, AbstractAuthenticationToken> {

	private final UserAccounts users;

	RoleJwtConverter(UserAccounts users) {
		this.users = users;
	}

	@Override
	public AbstractAuthenticationToken convert(Jwt jwt) {
		UUID id;
		try {
			id = UUID.fromString(jwt.getSubject());
		}
		catch (IllegalArgumentException | NullPointerException e) {
			throw new InvalidBearerTokenException("Invalid subject");
		}
		var authorities = users.ensureAndLoadRoles(id, jwt.getClaimAsString("email"))
			.stream()
			.map(role -> new SimpleGrantedAuthority("ROLE_" + role))
			.toList();
		return new JwtAuthenticationToken(jwt, authorities, id.toString());
	}

}
