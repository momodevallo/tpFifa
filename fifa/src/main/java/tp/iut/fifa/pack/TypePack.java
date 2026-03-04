package tp.iut.fifa.pack;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "types_packs")
public class TypePack {

    @Id
    @Column(name = "id")
    private Long id;

    @Column(name = "nom")
    private String nom;

    @Column(name = "prix")
    private long prix;

    @Column(name = "nb_cartes")
    private int nbCartes;

    @Column(name = "pct_bronze")
    private int pctBronze;

    @Column(name = "pct_argent")
    private int pctArgent;

    @Column(name = "pct_or")
    private int pctOr;

    public TypePack() {}

    public Long getId() { return id; }
    public String getNom() { return nom; }
    public long getPrix() { return prix; }
    public int getNbCartes() { return nbCartes; }
    public int getPctBronze() { return pctBronze; }
    public int getPctArgent() { return pctArgent; }
    public int getPctOr() { return pctOr; }

}
