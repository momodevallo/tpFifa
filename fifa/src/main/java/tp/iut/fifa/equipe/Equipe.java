package tp.iut.fifa.equipe;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "equipes")
public class Equipe {
    @Id
    private int utilisateurId;

    @Column(nullable = false)
    private String formation = "4-4-2";

    public int getUtilisateurId() {
        return utilisateurId;
    }
    public void setUtilisateurId(int utilisateurId) {
        this.utilisateurId = utilisateurId;
    }
    public String getFormation() {
        return formation;
    }
}
