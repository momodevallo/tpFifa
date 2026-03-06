package tp.iut.fifa.marketplace;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AnnonceMarcheRepository extends JpaRepository<AnnonceMarche, Long> {
    List<AnnonceMarche> findAll();
}
