package tp.iut.fifa.user;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "utilisateurs")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private String pseudo;
    private String mdp;

    public User() {
    }

    public int getId() {
        return id;
    }

    public String getPseudo() {
        return pseudo;
    }

    public String getMdp() {
        return mdp;
    }

    public void setPseudo(String pseudo) {
        this.pseudo = pseudo;
    }

    public void setMdp(String mdp) {
        this.mdp = mdp;
    }
}
