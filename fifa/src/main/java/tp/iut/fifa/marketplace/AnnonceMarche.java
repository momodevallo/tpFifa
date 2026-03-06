package tp.iut.fifa.marketplace;

import jakarta.persistence.*;
import tp.iut.fifa.carte.Carte;
import tp.iut.fifa.user.User;

@Entity
@Table(name = "annonces_marche")
public class AnnonceMarche {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "carte_id", nullable = false, unique = true)
    private Carte carte;

    @ManyToOne
    @JoinColumn(name = "vendeur_id", nullable = false)
    private User vendeur;

    @Column(nullable = false)
    private Long prix;

    public AnnonceMarche() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Carte getCarte() {
        return carte;
    }

    public void setCarte(Carte carte) {
        this.carte = carte;
    }

    public User getVendeur() {
        return vendeur;
    }

    public void setVendeur(User vendeur) {
        this.vendeur = vendeur;
    }

    public Long getPrix() {
        return prix;
    }

    public void setPrix(Long prix) {
        this.prix = prix;
    }
}