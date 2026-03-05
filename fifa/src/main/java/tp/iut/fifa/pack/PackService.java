package tp.iut.fifa.pack;

import org.springframework.stereotype.Service;
import tp.iut.fifa.carte.Carte;
import tp.iut.fifa.carte.CarteRepository;
import tp.iut.fifa.joueur.Joueur;
import tp.iut.fifa.joueur.JoueurRepository;
import tp.iut.fifa.joueur.Qualite;
import tp.iut.fifa.user.User;
import tp.iut.fifa.wallet.PortefeuilleRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
public class PackService {
    private final TypePackRepository typePackRepository;
    private final PortefeuilleRepository portefeuilleRepository;
    private final CarteRepository carteRepository;
    private final JoueurRepository joueurRepository;
    private final Random random = new Random();


    public PackService(TypePackRepository typePackRepository,PortefeuilleRepository portefeuilleRepository,CarteRepository carteRepository,JoueurRepository joueurRepository){
        this.typePackRepository = typePackRepository;
        this.portefeuilleRepository = portefeuilleRepository;
        this.carteRepository = carteRepository;
        this.joueurRepository = joueurRepository;
    }

    public List<Carte> ouvrirPack(TypePack pack, User user) {
        var portefeuille = portefeuilleRepository.findByUtilisateurId(user.getId());

        if (portefeuille.getCredits() < pack.getPrix()) {
            throw new IllegalStateException("Vous n'avez pas assez de crédit pour ouvrir ce pack ! ");
        }

        portefeuille.setCredits(portefeuille.getCredits() - pack.getPrix());
        portefeuilleRepository.save(portefeuille);

        List<Carte> cartesObtenues = new ArrayList<>();

        for (int i = 0; i < pack.getNbCartes(); i++) {
            Qualite qualite = tirerDeLaQuali(pack);
            Joueur joueurTire = tirerJoueur(qualite);
            Carte carte = new Carte();
            carte.setUtilisateur(user);
            carte.setJoueur(joueurTire);
            carte.setNonEchangeable(false);
            carteRepository.save(carte);
            cartesObtenues.add(carte);
        }

        return cartesObtenues;
    }



    private Qualite tirerDeLaQuali(TypePack pack) {
        int r = random.nextInt(100);
        int bronze = pack.getPctBronze();
        int argent = pack.getPctArgent();
        int or = pack.getPctOr();

        if (r < bronze) {
            return Qualite.bronze;
        } else if (r < bronze + argent) {
            return Qualite.argent;
        } else {
            return Qualite.or;
        }
    }

    private Joueur tirerJoueur(Qualite qualite) {
        List<Joueur> candidats = joueurRepository.findByQualite(qualite);
        int indexAleatoire = random.nextInt(candidats.size());
        return candidats.get(indexAleatoire);
    }





}
