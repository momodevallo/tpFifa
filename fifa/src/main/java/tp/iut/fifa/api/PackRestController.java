package tp.iut.fifa.api;

import org.springframework.web.bind.annotation.*;
import tp.iut.fifa.carte.Carte;
import tp.iut.fifa.pack.PackService;
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
    public void ouvrirPack(Principal principal, @PathVariable Long id) {
        String pseudo = principal.getName();
        User user = userRepository.findByPseudo(pseudo);

        TypePack pack = typePackRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Pack inconnu"));

        packService.ouvrirPack(pack, user);
    }
}
