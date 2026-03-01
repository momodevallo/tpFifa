package tp.iut.fifa.user;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByPseudo(username);
        if (user == null) {
            throw new UsernameNotFoundException("L'identifiant n'existe pas");
        }
        return new org.springframework.security.core.userdetails.User(
                user.getPseudo(),
                user.getMdp(),
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
    }

}
