package tp.iut.fifa.api;

import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
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

    public UserRestController(UserRepository userRepository, CarteRepository carteRepository, UserService userService, PortefeuilleRepository portefeuilleRepository) {
        this.userRepository = userRepository;
        this.carteRepository = carteRepository;
        this.userService = userService;
        this.portefeuilleRepository = portefeuilleRepository;
    }

    @GetMapping("/moi")
    public Mono<User> userCo(Mono<Principal> principalMono) {
        return principalMono.flatMap(p ->
                Mono.fromCallable(() -> userRepository.findByPseudo(p.getName()))
                        .subscribeOn(Schedulers.boundedElastic())
        );
    }

    @GetMapping("/moi/cartes")
    public Flux<Carte> mesCartes(Mono<Principal> principalMono) {
        return principalMono
                .map(Principal::getName)
                .flatMap(username -> Mono.fromCallable(() -> userRepository.findByPseudo(username))
                        .subscribeOn(Schedulers.boundedElastic()))
                .flatMapMany(user -> Mono.fromCallable(() -> carteRepository.findByUtilisateur(user))
                        .subscribeOn(Schedulers.boundedElastic())
                        .flatMapMany(Flux::fromIterable));
    }


    @GetMapping("/moi/credits")
    public Mono<Long> mesCredits(Mono<Principal> principalMono) {
        return principalMono.flatMap(p ->
                Mono.fromCallable(() -> userRepository.findByPseudo(p.getName()))
                        .subscribeOn(Schedulers.boundedElastic())
        ).flatMap(user ->
                Mono.fromCallable(() -> {
                            Portefeuille portefeuille = portefeuilleRepository.findByUtilisateurId(user.getId());
                            return portefeuille.getCredits();
                        })
                        .subscribeOn(Schedulers.boundedElastic())
        );
    }

    @PostMapping("/inscription")
    public Mono<User> inscrire(@RequestBody User requestUser) {
        return Mono.fromCallable(() ->
                        userService.inscription(requestUser.getPseudo(), requestUser.getMdp())
                )
                .subscribeOn(Schedulers.boundedElastic());
    }
}