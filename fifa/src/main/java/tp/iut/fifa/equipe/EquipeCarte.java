package tp.iut.fifa.equipe;

import jakarta.persistence.*;
import tp.iut.fifa.joueur.Poste;

@Entity
@Table(name = "equipes_cartes")
public class EquipeCarte {
    @Id
    private int utilisateurId;

    @Enumerated(EnumType.STRING)
    private Poste poste;

    @Column(name = "carte_id")
    private Long carteId;

    // Getters/setters COMPLÈTES :
    public int getUtilisateurId() { return utilisateurId; }
    public void setUtilisateurId(int utilisateurId) { this.utilisateurId = utilisateurId; }

    public Poste getPoste() { return poste; }
    public void setPoste(Poste poste) { this.poste = poste; }

    public Long getCarteId() { return carteId; }
    public void setCarteId(Long carteId) { this.carteId = carteId; }
}
