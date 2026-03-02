package tp.iut.fifa.carte;

import jakarta.persistence.JoinColumn;
import org.springframework.data.jpa.repository.JpaRepository;
import tp.iut.fifa.user.User;

import java.util.List;

public interface CarteRepository extends JpaRepository<Carte, Long> {
    List<Carte> findByUtilisateur(User utilisateur);
}
