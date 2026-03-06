package tp.iut.fifa.equipe;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EquipeCarteRepository extends JpaRepository<EquipeCarte, EquipeCarteId> {
    List<EquipeCarte> findByUtilisateurId(int utilisateurId);
}