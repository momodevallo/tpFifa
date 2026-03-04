package tp.iut.fifa.pack;

import org.springframework.stereotype.Service;
import tp.iut.fifa.carte.CarteRepository;
import tp.iut.fifa.joueur.Joueur;
import tp.iut.fifa.joueur.JoueurRepository;
import tp.iut.fifa.joueur.Qualite;
import tp.iut.fifa.user.User;
import tp.iut.fifa.wallet.PortefeuilleRepository;

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

    public void ouvrirPack(TypePack pack, User user) {
        var portefeuille = portefeuilleRepository.findByUtilisateurId(user.getId());

        if (portefeuille.getCredits() < pack.getPrix()) {
            throw new IllegalStateException("Vous n'avez pas assez de crédit pour ouvrir ce pack ! ");
        }

        // débiter le prix du pack
        portefeuille.setCredits(portefeuille.getCredits() - pack.getPrix());
        portefeuilleRepository.save(portefeuille);

        // TODO: tirer pack.getNbCartes() joueurs selon les pourcentages du pack
        // TODO: pour chaque joueur tiré, créer une Carte:
        // Carte c = new Carte();
        // c.setUtilisateur(user);
        // c.setJoueur(joueurTire);
        // c.setNonEchangeable(false);
        // carteRepository.save(c);
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

    private Joueur tirerJoueur(Qualite qualite){
        carte.joueur;
    }




}
