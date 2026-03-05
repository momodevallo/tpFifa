package tp.iut.fifa.user;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.ReactiveUserDetailsService;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.Optional;

@Service
public class CustomUserDetailsService implements ReactiveUserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public Mono<UserDetails> findByUsername(String username) {
        return Mono.fromCallable(() ->
                        Optional.ofNullable(userRepository.findByPseudo(username))
                                .orElseThrow(() -> new UsernameNotFoundException("L'identifiant n'existe pas"))
                )
                .subscribeOn(Schedulers.boundedElastic())
                .map(u -> new org.springframework.security.core.userdetails.User(
                        u.getPseudo(),
                        u.getMdp(),
                        List.of(new SimpleGrantedAuthority("ROLE_USER"))
                ));
    }
}