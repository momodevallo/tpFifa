package tp.iut.fifa.equipe;

import java.io.Serializable;
import java.util.Objects;

public class EquipeCarteId implements Serializable {
    private int utilisateurId;
    private Long carteId;

    public EquipeCarteId() {}

    public EquipeCarteId(int utilisateurId, Long carteId) {
        this.utilisateurId = utilisateurId;
        this.carteId = carteId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EquipeCarteId that = (EquipeCarteId) o;
        return utilisateurId == that.utilisateurId && Objects.equals(carteId, that.carteId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(utilisateurId, carteId);
    }
}
