package tp.iut.fifa.joueur;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JoueurRepository extends JpaRepository<Joueur, Long> {
    List<Joueur> findByQualiteIn(List<Qualite> qualites);

}
