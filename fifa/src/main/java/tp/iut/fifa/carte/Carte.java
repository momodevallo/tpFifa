package tp.iut.fifa.carte;

import jakarta.persistence.*;
import tp.iut.fifa.joueur.Joueur;
import tp.iut.fifa.user.User;

@Entity
@Table(name = "cartes")
public class Carte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "utilisateur_id")
    private User utilisateur;

    @ManyToOne
    @JoinColumn(name = "joueur_id", nullable = false)
    private Joueur joueur;

    public Carte(){
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }
    public User getUtilisateur() {
        return utilisateur;
    }
    public void setUtilisateur(User utilisateur) {
        this.utilisateur = utilisateur;
    }
    public Joueur getJoueur() {
        return joueur;
    }
    public void setJoueur(Joueur joueur) {
        this.joueur = joueur;
    }
}
