package tp.iut.fifa.joueur;

import jakarta.persistence.*;

@Entity
@Table(name="joueurs")
public class Joueur {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String nom;
    @Enumerated(EnumType.STRING)
    private Poste poste;
    @Enumerated(EnumType.STRING)
    private Qualite qualite;
    private int note;
    private String image_url;
    private String nationalite;
    private String club;

    public Joueur() {}

    public Long getId() {
        return id;
    }

    public String getNom() {
        return nom;
    }
    public Poste getPoste() {
        return poste;
    }
    public Qualite getQualite() {
        return qualite;
    }
    public int getNote() {
        return note;
    }
    public String getImage_url() {
        return image_url;
    }
    public String getNationalite() {
        return nationalite;
    }
    public String getClub() {
        return club;
    }
}
