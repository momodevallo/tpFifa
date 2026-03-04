package tp.iut.fifa.user;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import tp.iut.fifa.carte.Carte;
import tp.iut.fifa.carte.CarteRepository;
import tp.iut.fifa.joueur.Joueur;
import tp.iut.fifa.joueur.JoueurRepository;
import tp.iut.fifa.joueur.Poste;
import tp.iut.fifa.joueur.Qualite;
import tp.iut.fifa.wallet.Portefeuille;
import tp.iut.fifa.wallet.PortefeuilleRepository;

import java.util.ArrayList;
import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JoueurRepository joueurRepository;
    private final CarteRepository carteRepository;
    private final PortefeuilleRepository portefeuilleRepository;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, JoueurRepository joueurRepository, CarteRepository carteRepository,PortefeuilleRepository portefeuilleRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.joueurRepository = joueurRepository;
        this.carteRepository = carteRepository;
        this.portefeuilleRepository = portefeuilleRepository;
    }

    private void creerEquipeDeBase(User user) {
        List<Joueur> joueurs = joueurRepository.findByQualiteIn(List.of(Qualite.bronze, Qualite.argent));

        List<Joueur> gardien   = new ArrayList<>();
        List<Joueur> defenseur = new ArrayList<>();
        List<Joueur> millieu   = new ArrayList<>();
        List<Joueur> attaquant = new ArrayList<>();

        for (Joueur j : joueurs) {
            if (j.getPoste() == Poste.GB) {
                gardien.add(j);
            } else if (j.getPoste() == Poste.DEF) {
                defenseur.add(j);
            } else if (j.getPoste() == Poste.MIL) {
                millieu.add(j);
            } else if (j.getPoste() == Poste.ATT) {
                attaquant.add(j);
            }
        }

        int countGard = 0;
        for (Joueur j : gardien) {
            if (countGard >= 1) break;
            Carte carte = new Carte();
            carte.setUtilisateur(user);
            carte.setJoueur(j);
            carte.setNonEchangeable(true);
            carteRepository.save(carte);
            countGard++;
        }

        int countDef = 0;
        for (Joueur j : defenseur) {
            if (countDef >= 4) break;
            Carte carte = new Carte();
            carte.setUtilisateur(user);
            carte.setJoueur(j);
            carte.setNonEchangeable(true);
            carteRepository.save(carte);
            countDef++;
        }

        int countMil = 0;
        for (Joueur j : millieu) {
            if (countMil >= 4) break;
            Carte carte = new Carte();
            carte.setUtilisateur(user);
            carte.setJoueur(j);
            carte.setNonEchangeable(true);
            carteRepository.save(carte);
            countMil++;
        }

        int countAtt = 0;
        for (Joueur j : attaquant) {
            if (countAtt >= 2) break;
            Carte carte = new Carte();
            carte.setUtilisateur(user);
            carte.setJoueur(j);
            carte.setNonEchangeable(true);
            carteRepository.save(carte);
            countAtt++;
        }
    }



    public User inscription(String pseudo, String mdp) {
        String hashedPassword = passwordEncoder.encode(mdp);

        User user = new User();
        user.setPseudo(pseudo);
        user.setMdp(hashedPassword);

        User saved = userRepository.save(user);
        creerEquipeDeBase(saved);

        Portefeuille portefeuille = new Portefeuille();
        portefeuille.setUtilisateurId(saved.getId());
        portefeuille.setCredits(5000);
        portefeuilleRepository.save(portefeuille);

        return saved;
    }

}