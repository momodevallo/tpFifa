package tp.iut.fifa.api;

import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
import tp.iut.fifa.carte.Carte;
import tp.iut.fifa.carte.CarteRepository;
import tp.iut.fifa.marketplace.AnnonceMarche;
import tp.iut.fifa.marketplace.AnnonceMarcheRepository;
import tp.iut.fifa.user.User;
import tp.iut.fifa.user.UserRepository;
import tp.iut.fifa.wallet.Portefeuille;
import tp.iut.fifa.wallet.PortefeuilleRepository;

import java.security.Principal;

@RestController
@RequestMapping("/api")
public class MarketplaceRestController {

    private final AnnonceMarcheRepository annonceMarcheRepository;
    private final UserRepository userRepository;
    private final CarteRepository carteRepository;
    private final PortefeuilleRepository portefeuilleRepository;

    public MarketplaceRestController(AnnonceMarcheRepository annonceMarcheRepository, UserRepository userRepository, CarteRepository carteRepository,PortefeuilleRepository portefeuilleRepository) {
        this.annonceMarcheRepository = annonceMarcheRepository;
        this.userRepository = userRepository;
        this.carteRepository = carteRepository;
        this.portefeuilleRepository = portefeuilleRepository;
    }

    @GetMapping("/marketplace")
    public Flux<AnnonceMarche> toutesLesAnnonces() {
        return Mono.fromCallable(annonceMarcheRepository::findAll)
                .subscribeOn(Schedulers.boundedElastic())
                .flatMapMany(Flux::fromIterable);
    }

    @PostMapping("/marketplace/annonces")
    public Mono<AnnonceMarche> mettreEnVente(Mono<Principal> principalMono,
                                             @RequestBody MettreEnVenteRequest req) {
        return principalMono
                .map(Principal::getName)
                .flatMap(pseudo ->
                        Mono.fromCallable(() -> {
                            User user = userRepository.findByPseudo(pseudo);
                            if (user == null) {
                                throw new IllegalArgumentException("Utilisateur inconnu");
                            }
                            return user;
                        }).subscribeOn(Schedulers.boundedElastic())
                )
                .flatMap(user ->
                        Mono.fromCallable(() -> {
                            Carte carte = carteRepository.findById(req.carteId())
                                    .orElseThrow(() -> new IllegalArgumentException("Carte inconnue"));

                            if (!carte.getUtilisateur().getId().equals(user.getId())) {
                                throw new IllegalStateException("Cette carte ne t'appartient pas");
                            }

                            AnnonceMarche annonce = new AnnonceMarche();
                            annonce.setCarte(carte);
                            annonce.setVendeur(user);
                            annonce.setPrix(req.prix());

                            return annonceMarcheRepository.save(annonce);
                        }).subscribeOn(Schedulers.boundedElastic())
                );
    }

    @PostMapping("/marketplace/annonces/{id}/acheter")
    public Mono<String> acheter(Mono<Principal> principalMono, @PathVariable Long id) {
        return principalMono
                .map(Principal::getName)
                .flatMap(pseudo ->
                        Mono.fromCallable(() -> userRepository.findByPseudo(pseudo))
                                .subscribeOn(Schedulers.boundedElastic())
                )
                .flatMap(acheteur ->
                        Mono.fromCallable(() -> {
                            AnnonceMarche annonce = annonceMarcheRepository.findById(id)
                                    .orElseThrow(() -> new IllegalArgumentException("Annonce inconnue"));

                            Portefeuille portefeuilleAcheteur = portefeuilleRepository.findByUtilisateurId(acheteur.getId());
                            Portefeuille portefeuilleVendeur = portefeuilleRepository.findByUtilisateurId(annonce.getVendeur().getId());

                            if (portefeuilleAcheteur.getCredits() < annonce.getPrix()) {
                                throw new IllegalStateException("Crédits insuffisants");
                            }

                            portefeuilleAcheteur.setCredits(portefeuilleAcheteur.getCredits() - annonce.getPrix());
                            portefeuilleVendeur.setCredits(portefeuilleVendeur.getCredits() + annonce.getPrix());
                            portefeuilleRepository.save(portefeuilleAcheteur);
                            portefeuilleRepository.save(portefeuilleVendeur);

                            Carte carte = annonce.getCarte();
                            carte.setUtilisateur(acheteur);
                            carteRepository.save(carte);
                            annonceMarcheRepository.delete(annonce);
                            return "Achat effectué !";
                        }).subscribeOn(Schedulers.boundedElastic())
                );
    }

    @DeleteMapping("/marketplace/annonces/{id}")
    public Mono<String> retirerAnnonce(Mono<Principal> principalMono, @PathVariable Long id) {
        return principalMono
                .map(Principal::getName)
                .flatMap(pseudo ->
                        Mono.fromCallable(() -> userRepository.findByPseudo(pseudo))
                                .subscribeOn(Schedulers.boundedElastic())
                )
                .flatMap(user ->
                        Mono.fromCallable(() -> {
                            AnnonceMarche annonce = annonceMarcheRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Annonce inconnue"));
                            if (!user.equals(annonce.getVendeur())) {
                                throw new IllegalStateException("Ce n'est pas ton annonce");
                            }

                            annonceMarcheRepository.delete(annonce);

                            return "Annonce supprimée !";
                        }).subscribeOn(Schedulers.boundedElastic())
                );
    }





    public record MettreEnVenteRequest(Long carteId, Long prix) {}
}
