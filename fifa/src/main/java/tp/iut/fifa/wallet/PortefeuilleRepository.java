package tp.iut.fifa.wallet;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PortefeuilleRepository extends JpaRepository<Portefeuille, Integer> {
    Portefeuille findByUtilisateurId(int utilisateurId);
}
