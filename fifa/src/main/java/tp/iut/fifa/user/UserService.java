package tp.iut.fifa.user;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import tp.iut.fifa.carte.CarteRepository;
import tp.iut.fifa.joueur.Joueur;
import tp.iut.fifa.joueur.JoueurRepository;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JoueurRepository joueurRepository;
    private final CarteRepository carteRepository;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, JoueurRepository joueurRepository, CarteRepository carteRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.joueurRepository = joueurRepository;
        this.carteRepository = carteRepository;
    }

    private void creerEquipeDeBase(User user) {
        List<Joueur> joueurs = joueurRepository.findAll();

    }


    public User inscription(String pseudo, String mdp) {
        String hashedPassword = passwordEncoder.encode(mdp);

        User user = new User();
        user.setPseudo(pseudo);
        user.setMdp(hashedPassword);
        User saved = userRepository.save(user);
        creerEquipeDeBase(saved);
        return saved;
    }
}
