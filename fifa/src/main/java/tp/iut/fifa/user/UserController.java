package tp.iut.fifa.user;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

@Controller
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @RequestMapping(path="/inscription", method= RequestMethod.POST)
    public String inscription(String username, String password) {
        userService.inscription(username, password);
        return "redirect:/login";
    }

    @RequestMapping(path="/", method= RequestMethod.GET)
    public String getHome() {;
        return "redirect:/login";
    }

    // GET pour Spring comprenne que c cette page qui faut afficher
    @RequestMapping(path="/login", method= RequestMethod.GET)
    public String PRGLogin() {
        return "login";
    }


}
