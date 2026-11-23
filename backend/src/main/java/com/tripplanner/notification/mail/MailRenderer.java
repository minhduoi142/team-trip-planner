package com.tripplanner.notification.mail;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

/**
 * Render email bằng Thymeleaf lõi (TemplateEngine riêng, không dính view resolver MVC). Template nằm ở
 * {@code src/main/resources/mail/}: {@code *.html} (HTML) và {@code *.txt} (TEXT).
 * <p>
 * Render 2 lượt: thân email trước, rồi nhét vào {@code layout.html} / {@code layout.txt} (header + footer huỷ nhận).
 */
@Component
public class MailRenderer {

    private static final Locale VI = Locale.forLanguageTag("vi-VN");

    private final TemplateEngine engine;

    public MailRenderer() {
        engine = new TemplateEngine();
        engine.addTemplateResolver(resolver("*.html", TemplateMode.HTML, 1));
        engine.addTemplateResolver(resolver("*.txt", TemplateMode.TEXT, 2));
    }

    /** Link ở footer email (huỷ nhận…). */
    public record FooterLink(String label, String url) {
    }

    /** Phần chung của layout: dòng tóm tắt hiện trong hộp thư, lý do nhận email, các link footer. */
    public record Layout(String preheader, String footerNote, List<FooterLink> links) {
    }

    public record Rendered(String html, String text) {
    }

    /**
     * @param template tên template không đuôi (vd {@code "digest"}), cần có cả {@code .html} và {@code .txt}
     */
    public Rendered render(String template, Map<String, Object> variables, Layout layout) {
        Context body = context(variables);
        String bodyHtml = engine.process(template + ".html", body);
        String bodyText = engine.process(template + ".txt", body);

        Context page = context(Map.of());
        page.setVariable("bodyHtml", bodyHtml);
        page.setVariable("bodyText", bodyText.strip());
        page.setVariable("preheader", layout.preheader());
        page.setVariable("footerNote", layout.footerNote());
        page.setVariable("links", layout.links());
        return new Rendered(engine.process("layout.html", page), engine.process("layout.txt", page));
    }

    private static Context context(Map<String, Object> variables) {
        Context context = new Context(VI);
        context.setVariables(variables);
        context.setVariable("fmt", MailFormat.INSTANCE);
        return context;
    }

    private static ClassLoaderTemplateResolver resolver(String pattern, TemplateMode mode, int order) {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("mail/");
        resolver.setCharacterEncoding("UTF-8");
        resolver.setTemplateMode(mode);
        resolver.getResolvablePatternSpec().addPattern(pattern);
        resolver.setCheckExistence(true);
        resolver.setCacheable(true);
        resolver.setOrder(order);
        return resolver;
    }
}
