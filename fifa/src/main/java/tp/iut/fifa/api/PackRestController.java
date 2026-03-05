package tp.iut.fifa.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
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
    @Autowired
    private StockagePacks stockagePacks;


    public PackRestController(TypePackRepository typePackRepository,PackService packService,UserRepository userRepository) {
        this.typePackRepository = typePackRepository;
        this.packService = packService;
        this.userRepository = userRepository;
    }

    @GetMapping("/packs")
    public List<TypePack> tousLesPacks() {
        return typePackRepository.findAll();
    }

    @PostMapping("/packs/{id}/ouvrir")
    public String ouvrirPack(Principal principal, @PathVariable Long id) {
        String pseudo = principal.getName();
        User user = userRepository.findByPseudo(pseudo);
        TypePack pack = typePackRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Pack inconnu"));

        String uuid = stockagePacks.reserver();

        new Thread(() -> {
            List<Carte> cartes = packService.ouvrirPack(pack, user);
            stockagePacks.mettreAJour(uuid, cartes);
        }).start();

        return uuid;
    }

    @GetMapping("/packs/{uuid}")
    public List<Carte> getPackResult(@PathVariable String uuid) {
        return stockagePacks.obtenir(uuid);
    }

    // Lister les offres disponibles
    @GetMapping("/marketplace")
    public List<Offre> marketplace() {
        return offreRepository.findByVendueFalse();
    }

    // Mettre une carte en vente
    @PostMapping("/marketplace/offres")
    public Offre mettreEnVente(@RequestBody Offre offre) {
        return offreRepository.save(offre);
    }

    // Acheter une offre
    @PostMapping("/marketplace/offres/{id}/acheter")
    public String acheter(@PathVariable Long id, Principal principal) {
        // logique d'achat ici
        return "Achat OK";
    }

    // Retirer son offre
    @DeleteMapping("/marketplace/offres/{id}")
    public void retirerOffre(@PathVariable Long id, Principal principal) {
        // logique
    }




}
