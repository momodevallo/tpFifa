package tp.iut.fifa.api;

import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
import tp.iut.fifa.carte.Carte;
import tp.iut.fifa.pack.PackService;
import tp.iut.fifa.pack.StockagePacks;
import tp.iut.fifa.pack.TypePack;
import tp.iut.fifa.pack.TypePackRepository;
import tp.iut.fifa.user.User;
import tp.iut.fifa.user.UserRepository;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api")
public class PackRestController {

    private final TypePackRepository typePackRepository;
    private final PackService packService;
    private final UserRepository userRepository;
    private final StockagePacks stockagePacks;

    public PackRestController(TypePackRepository typePackRepository, PackService packService, UserRepository userRepository, StockagePacks stockagePacks) {
        this.typePackRepository = typePackRepository;
        this.packService = packService;
        this.userRepository = userRepository;
        this.stockagePacks = stockagePacks;
    }

    @GetMapping("/packs")
    public Flux<TypePack> tousLesPacks() {
        return Mono.fromCallable(typePackRepository::findAll)
                .subscribeOn(Schedulers.boundedElastic())
                .flatMapMany(Flux::fromIterable);
    }

    @PostMapping("/packs/{id}/ouvrir")
    public Mono<String> ouvrirPack(Mono<Principal> principalMono, @PathVariable Long id) {
        return principalMono.flatMap(principal ->
                Mono.fromCallable(() -> {
                            String pseudo = principal.getName();
                            User user = userRepository.findByPseudo(pseudo);
                            TypePack pack = typePackRepository.findById(id)
                                    .orElseThrow(() -> new IllegalArgumentException("Pack inconnu"));

                            String uuid = stockagePacks.reserver();
                            Mono.fromCallable(() -> packService.ouvrirPack(pack, user))
                                    .subscribeOn(Schedulers.boundedElastic())
                                    .doOnSuccess(cartes -> stockagePacks.mettreAJour(uuid, cartes))
                                    .doOnError(err -> stockagePacks.liberer(uuid))
                                    .subscribe();

                            return uuid;
                        })
                        .subscribeOn(Schedulers.boundedElastic())
        );
    }

    @GetMapping("/packs/{uuid}")
    public Mono<List<Carte>> getPackResult(@PathVariable String uuid) {
        return Mono.fromSupplier(() -> stockagePacks.obtenir(uuid));
    }
}