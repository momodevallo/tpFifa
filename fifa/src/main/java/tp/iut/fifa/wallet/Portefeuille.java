package tp.iut.fifa.wallet;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "portefeuilles")
public class Portefeuille {
    @Id
    @Column(name = "utilisateur_id")
    private int utilisateurId;
    @Column(name = "credits")
    private long credits;

    public Portefeuille() {}

    public int getUtilisateurId() {
        return utilisateurId;
    }
    public void setUtilisateurId(int utilisateurId) {
        this.utilisateurId = utilisateurId;
    }

    public Long getCredits() {
        return credits;
    }
    public void setCredits(long credits) {
        this.credits = credits;
    }
}
