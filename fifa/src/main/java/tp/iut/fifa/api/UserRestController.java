package tp.iut.fifa.api;

import org.springframework.web.bind.annotation.*;
import tp.iut.fifa.carte.Carte;
import tp.iut.fifa.carte.CarteRepository;
import tp.iut.fifa.user.User;
import tp.iut.fifa.user.UserRepository;
import tp.iut.fifa.user.UserService;
import tp.iut.fifa.wallet.Portefeuille;
import tp.iut.fifa.wallet.PortefeuilleRepository;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api")
public class UserRestController {
    private final UserRepository userRepository;
    private final CarteRepository carteRepository;
    private final UserService userService;
    private final PortefeuilleRepository portefeuilleRepository;

    public UserRestController(UserRepository userRepository, CarteRepository carteRepository,UserService userService,PortefeuilleRepository portefeuilleRepository){
        this.userRepository = userRepository;
        this.carteRepository = carteRepository;
        this.userService = userService;
        this.portefeuilleRepository = portefeuilleRepository;
    }

    @GetMapping("/moi")
    public User userCo(Principal principal) {
        String pseudo = principal.getName();
        User user = userRepository.findByPseudo(pseudo);
        return user;
    }

    @GetMapping("/moi/cartes")
    public List<Carte> mesCartes(Principal principal) {
        String pseudo = principal.getName();
        User user = userRepository.findByPseudo(pseudo);
        return carteRepository.findByUtilisateur(user);
    }

    @GetMapping("/moi/credits")
    public long mesCredits(Principal principal) {
        String pseudo = principal.getName();
        User user = userRepository.findByPseudo(pseudo);
        Portefeuille portefeuille = portefeuilleRepository.findByUtilisateurId(user.getId());
        return portefeuille.getCredits();
    }




    @PostMapping("/inscription")
    public User inscrire(@RequestBody User requestUser) {
        return userService.inscription(
                requestUser.getPseudo(),
                requestUser.getMdp()
        );
    }

}