package tp.iut.fifa.equipe;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EquipeRepository extends JpaRepository<Equipe, Integer> {
    Optional<Equipe> findByUtilisateurId(int utilisateurId);
}
