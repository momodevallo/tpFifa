package tp.iut.fifa.api;

import org.springframework.web.bind.annotation.*;
import tp.iut.fifa.carte.CarteRepository;
import tp.iut.fifa.user.User;
import tp.iut.fifa.user.UserRepository;
import tp.iut.fifa.user.UserService;

import java.security.Principal;

@RestController
@RequestMapping("/api")
public class UserRestController {
    private final UserRepository userRepository;
    private final CarteRepository carteRepository;
    private final UserService userService;

    public UserRestController(UserRepository userRepository, CarteRepository carteRepository,UserService userService){
        this.userRepository = userRepository;
        this.carteRepository = carteRepository;
        this.userService = userService;
    }

    @GetMapping("/moi")
    public User userCo(Principal principal) {
        String pseudo = principal.getName();
        User user = userRepository.findByPseudo(pseudo);
        return user;
    }

    @PostMapping("/inscription")
    public User inscrire(@RequestBody User requestUser) {
        return userService.inscription(
                requestUser.getPseudo(),
                requestUser.getMdp()
        );
    }



}
